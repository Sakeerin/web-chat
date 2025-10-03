import { IsString, IsOptional, IsUUID } from 'class-validator';

export class BlockUserDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BlockUserByUsernameDto {
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UnblockUserDto {
  @IsUUID()
  userId: string;
}

export class BlockedUserResponse {
  id: string;
  blockingUserId: string;
  blockedUserId: string;
  reason?: string | null;
  createdAt: Date;
  blockedUser: {
    id: string;
    username: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export class BlockedUsersListResponse {
  blockedUsers: BlockedUserResponse[];
  total: number;
  hasMore: boolean;
}