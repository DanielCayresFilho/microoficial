import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import * as path from 'path';
import * as fs from 'fs';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.createCampaign(dto);
  }

  @Post(':id/upload-csv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = './uploads/campaigns';
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `campaign-${req.params.id}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadCsvAndStart(
    @Param('id') campaignId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: /(text\/csv|application\/vnd\.ms-excel)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    return this.campaignsService.uploadCsvAndStartCampaign(
      campaignId,
      file.path,
    );
  }

  @Post(':id/pause')
  pauseCampaign(@Param('id') id: string) {
    return this.campaignsService.pauseCampaign(id);
  }

  @Post(':id/resume')
  resumeCampaign(@Param('id') id: string) {
    return this.campaignsService.resumeCampaign(id);
  }

  @Delete(':id')
  deleteCampaign(@Param('id') id: string) {
    return this.campaignsService.deleteCampaign(id);
  }

  @Get()
  findAllCampaigns() {
    return this.campaignsService.findAllCampaigns();
  }

  @Get(':id')
  findCampaignById(@Param('id') id: string) {
    return this.campaignsService.findCampaignById(id);
  }

  @Get(':id/stats')
  getCampaignStats(@Param('id') id: string) {
    return this.campaignsService.getCampaignStats(id);
  }
}
