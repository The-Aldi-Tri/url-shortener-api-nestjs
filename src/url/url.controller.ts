import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/type/AuthenticatedRequest.type';
import { CreateUrlDto } from './dto/create-url.dto';
import { DeleteUrlDto } from './dto/delete-url.dto';
import { UrlService } from './url.service';

@ApiTags('Urls')
@Controller('urls')
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ description: 'Url successfully created' })
  @ApiUnauthorizedResponse({ description: 'Token not valid or not present' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnprocessableEntityResponse({ description: 'Data validation failed' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createUrlDto: CreateUrlDto,
  ) {
    const { id } = req.user;

    const createdUrl = await this.urlService.create(id, createUrlDto);

    return { message: 'Url successfully created', data: createdUrl };
  }

  @ApiBearerAuth()
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'Url(s) successfully retrieved' })
  @ApiUnauthorizedResponse({ description: 'Token not valid or not present' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findAllByUserId(@Req() req: AuthenticatedRequest) {
    const { id } = req.user;

    const urls = await this.urlService.findUrlsByUserId(id);

    return { message: 'Url(s) successfully retrieved', data: urls };
  }

  @Get(':shorten')
  @ApiOkResponse({ description: 'Original url found' })
  @ApiUnauthorizedResponse({ description: 'Token not valid or not present' })
  @ApiNotFoundResponse({ description: 'Url or user not found' })
  async findOne(@Param('shorten') shorten: string) {
    const url = await this.urlService.findByShorten(shorten);

    await this.urlService.incrementClicks(url._id);

    return { message: 'Original url found', data: url.origin };
  }

  @ApiBearerAuth()
  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'Url(s) successfully deleted' })
  @ApiUnauthorizedResponse({ description: 'Token not valid or not present' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnprocessableEntityResponse({ description: 'Data validation failed' })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Body() deleteUrlDto: DeleteUrlDto,
  ) {
    const { id: userId } = req.user;
    const { idsToDelete } = deleteUrlDto;

    const deleteCount = await this.urlService.deleteManyByUserId(
      userId,
      idsToDelete,
    );

    return { message: `${deleteCount} Url(s) successfully deleted` };
  }
}
