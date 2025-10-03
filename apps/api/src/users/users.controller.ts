import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ContactsService } from './contacts.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  UpdateProfileDto,
  UpdateUsernameDto,
  PrivacySettingsDto,
  SearchUsersDto,
  CheckUsernameDto,
  SendContactRequestDto,
  RespondToContactRequestDto,
  BlockUserDto,
  BlockUserByUsernameDto,
  ReportUserDto,
  ReportUserByUsernameDto,
} from './dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly contactsService: ContactsService,
  ) {}

  /**
   * Get current user's profile
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  /**
   * Get user profile by ID (public view)
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async getUserProfile(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.getPublicProfile(id, user.id);
  }

  /**
   * Update current user's profile
   */
  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: UpdateProfileDto })
  async updateMyProfile(
    @CurrentUser() user: any,
    @Body() updateData: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateData);
  }

  /**
   * Update current user's username
   */
  @Put('me/username')
  async updateMyUsername(
    @Request() req: any,
    @Body() updateData: UpdateUsernameDto,
  ) {
    return this.usersService.updateUsername(req.user.id, updateData);
  }

  /**
   * Check username availability
   */
  @Post('check-username')
  @HttpCode(HttpStatus.OK)
  async checkUsernameAvailability(@Body() checkData: CheckUsernameDto) {
    return this.usersService.checkUsernameAvailability(checkData);
  }

  /**
   * Update privacy settings
   */
  @Put('me/privacy')
  async updatePrivacySettings(
    @Request() req: any,
    @Body() settings: PrivacySettingsDto,
  ) {
    return this.usersService.updatePrivacySettings(req.user.id, settings);
  }

  /**
   * Get current user's privacy settings
   */
  @Get('me/privacy')
  async getPrivacySettings(@Request() req: any) {
    const profile = await this.usersService.getProfile(req.user.id);
    return profile.privacySettings;
  }

  /**
   * Search users
   */
  @Get()
  @ApiOperation({ summary: 'Search users' })
  @ApiResponse({ status: 200, description: 'Users found successfully' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Results limit' })
  @ApiQuery({ name: 'offset', required: false, description: 'Results offset' })
  async searchUsers(@Query() searchData: SearchUsersDto, @CurrentUser() user: any) {
    return this.usersService.searchUsers(searchData, user.id);
  }

  /**
   * Update last seen (called by WebSocket or activity tracking)
   */
  @Post('me/last-seen')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateLastSeen(@Request() req: any) {
    await this.usersService.updateLastSeen(req.user.id);
  }

  /**
   * Update online status
   */
  @Post('me/online-status')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateOnlineStatus(
    @Request() req: any,
    @Body() body: { isOnline: boolean },
  ) {
    await this.usersService.updateOnlineStatus(req.user.id, body.isOnline);
  }

  // Contact Management Endpoints

  /**
   * Send a contact request
   */
  @Post('contacts/requests')
  async sendContactRequest(
    @Request() req: any,
    @Body() requestData: SendContactRequestDto,
  ) {
    return this.contactsService.sendContactRequest(req.user.id, requestData);
  }

  /**
   * Respond to a contact request
   */
  @Put('contacts/requests/:requestId')
  async respondToContactRequest(
    @Request() req: any,
    @Param('requestId') requestId: string,
    @Body() responseData: RespondToContactRequestDto,
  ) {
    return this.contactsService.respondToContactRequest(
      req.user.id,
      requestId,
      responseData,
    );
  }

  /**
   * Get pending contact requests (received)
   */
  @Get('contacts/requests/pending')
  async getPendingContactRequests(@Request() req: any) {
    return this.contactsService.getPendingContactRequests(req.user.id);
  }

  /**
   * Get sent contact requests
   */
  @Get('contacts/requests/sent')
  async getSentContactRequests(@Request() req: any) {
    return this.contactsService.getSentContactRequests(req.user.id);
  }

  /**
   * Get contacts list
   */
  @Get('contacts')
  async getContacts(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.contactsService.getContacts(
      req.user.id,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
    );
  }

  /**
   * Remove a contact
   */
  @Delete('contacts/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeContact(
    @Request() req: any,
    @Param('contactId') contactId: string,
  ) {
    await this.contactsService.removeContact(req.user.id, contactId);
  }

  /**
   * Block a user by ID
   */
  @Post('blocked')
  async blockUser(@Request() req: any, @Body() blockData: BlockUserDto) {
    return this.contactsService.blockUser(req.user.id, blockData);
  }

  /**
   * Block a user by username
   */
  @Post('blocked/username')
  async blockUserByUsername(
    @Request() req: any,
    @Body() blockData: BlockUserByUsernameDto,
  ) {
    return this.contactsService.blockUserByUsername(req.user.id, blockData);
  }

  /**
   * Unblock a user
   */
  @Delete('blocked/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblockUser(
    @Request() req: any,
    @Param('userId') userId: string,
  ) {
    await this.contactsService.unblockUser(req.user.id, { userId });
  }

  /**
   * Get blocked users list
   */
  @Get('blocked')
  async getBlockedUsers(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.contactsService.getBlockedUsers(
      req.user.id,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
    );
  }

  /**
   * Report a user by ID
   */
  @Post('reports')
  async reportUser(@Request() req: any, @Body() reportData: ReportUserDto) {
    return this.contactsService.reportUser(req.user.id, reportData);
  }

  /**
   * Report a user by username
   */
  @Post('reports/username')
  async reportUserByUsername(
    @Request() req: any,
    @Body() reportData: ReportUserByUsernameDto,
  ) {
    return this.contactsService.reportUserByUsername(req.user.id, reportData);
  }

  /**
   * Check if users are contacts
   */
  @Get('contacts/check/:userId')
  async checkContactStatus(
    @Request() req: any,
    @Param('userId') userId: string,
  ) {
    const areContacts = await this.contactsService.areUsersContacts(
      req.user.id,
      userId,
    );
    return { areContacts };
  }
}