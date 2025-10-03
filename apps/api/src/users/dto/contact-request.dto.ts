import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ContactRequestStatus } from '@prisma/client';

export class SendContactRequestDto {
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class RespondToContactRequestDto {
  @IsEnum(['ACCEPTED', 'DECLINED'])
  status: 'ACCEPTED' | 'DECLINED';
}

export class ContactRequestResponse {
  id: string;
  senderId: string;
  receiverId: string;
  status: ContactRequestStatus;
  message?: string | null;
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: string;
    username: string;
    name: string;
    avatarUrl?: string | null;
  };
  receiver: {
    id: string;
    username: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export class ContactListResponse {
  contacts: ContactResponse[];
  total: number;
  hasMore: boolean;
}

export class ContactResponse {
  id: string;
  username: string;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  lastSeenAt?: Date;
  isOnline?: boolean;
  contactedAt: Date; // When they became contacts
}