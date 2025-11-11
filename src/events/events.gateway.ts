import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure based on your frontend URL
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private operatorSockets: Map<string, string> = new Map(); // operatorId -> socketId

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract API Key
      const apiKey =
        client.handshake.query.apiKey ||
        client.handshake.auth.apiKey ||
        client.handshake.headers['x-api-key'] ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      const validApiKey = this.configService.get<string>('API_KEY');

      if (!apiKey || apiKey !== validApiKey) {
        this.logger.warn(`Client ${client.id} connected with invalid API key`);
        client.disconnect();
        return;
      }

      this.logger.log(`Client ${client.id} connected successfully`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from operator sockets map
    for (const [operatorId, socketId] of this.operatorSockets.entries()) {
      if (socketId === client.id) {
        this.operatorSockets.delete(operatorId);
        this.logger.log(`Operator ${operatorId} disconnected`);
        await this.prisma.operatorPresence.updateMany({
          where: { operatorId },
          data: {
            isOnline: false,
            expiresAt: new Date(),
          },
        });
        break;
      }
    }
  }

  @SubscribeMessage('operator:join')
  async handleOperatorJoin(
    @MessageBody() data: { operatorId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { operatorId } = data;

    // Verify operator exists
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
    });

    if (!operator) {
      client.emit('error', { message: 'Operator not found' });
      return;
    }

    // Store operator socket mapping
    this.operatorSockets.set(operatorId, client.id);
    client.join(`operator:${operatorId}`);

    this.logger.log(`Operator ${operator.name} (${operatorId}) joined with socket ${client.id}`);

    // Send current open conversations to operator
    const conversations = await this.prisma.conversation.findMany({
      where: {
        operatorId,
        status: 'OPEN',
      },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        number: true,
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    client.emit('operator:conversations', { conversations });
  }

  @SubscribeMessage('operator:leave')
  async handleOperatorLeave(
    @MessageBody() data: { operatorId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { operatorId } = data;
    this.operatorSockets.delete(operatorId);
    client.leave(`operator:${operatorId}`);
    this.logger.log(`Operator ${operatorId} left`);
    await this.prisma.operatorPresence.updateMany({
      where: { operatorId },
      data: {
        isOnline: false,
        expiresAt: new Date(),
      },
    });
  }

  @SubscribeMessage('conversation:typing')
  async handleTyping(
    @MessageBody() data: { conversationId: string; operatorId: string },
  ) {
    // Broadcast typing indicator to other clients in conversation
    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('conversation:typing', data);
  }

  /**
   * Emit event to specific operator
   */
  emitToOperator(operatorId: string, event: string, data: any) {
    const socketId = this.operatorSockets.get(operatorId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
      this.logger.debug(`Emitted ${event} to operator ${operatorId}`);
    } else {
      this.logger.warn(`Operator ${operatorId} not connected via WebSocket`);
    }
  }

  /**
   * Emit event to all operators
   */
  emitToAllOperators(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.debug(`Emitted ${event} to all operators`);
  }

  /**
   * Emit event to specific conversation room
   */
  emitToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
    this.logger.debug(`Emitted ${event} to conversation ${conversationId}`);
  }
}
