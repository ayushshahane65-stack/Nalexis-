export type CircleMemberRole = "owner" | "moderator" | "member";

export interface CircleMember {
  id: string;
  name: string;
  initials: string;
  role: CircleMemberRole;
  currentPage: number;
  status: "on_pace" | "ahead" | "catching_up";
  avatarColor?: string;
  joinedAt: string;
}

export interface CircleChannel {
  id: string;
  name: string;
  topic: string;
  isSpoiler: boolean;
  chapterRange?: string;
}

export interface CircleThreadReply {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: CircleMemberRole;
  authorInitials: string;
  timestamp: string;
  content: string;
}

export interface CircleMessage {
  id: string;
  circleId: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorRole: CircleMemberRole;
  authorInitials: string;
  timestamp: string;
  content: string;
  chapterTag?: string;
  isSpoiler?: boolean;
  likes: number;
  replies: CircleThreadReply[];
}

export interface ReadingMilestone {
  id: string;
  title: string;
  targetPage: number;
  dueDate: string;
  completed: boolean;
}

export interface PrivateCircle {
  id: string;
  name: string;
  description: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverColor: string;
  bookCoverColorAlt: string;
  totalPages: number;
  currentMilestonePage: number;
  inviteCode: string;
  currentUserRole: CircleMemberRole;
  isJoined: boolean;
  channels: CircleChannel[];
  members: CircleMember[];
  schedule: ReadingMilestone[];
}
