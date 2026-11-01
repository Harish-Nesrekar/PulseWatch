declare namespace Express {
  interface Request {
    auth?: {
      userId: string;
      sessionId: string;
      organizationId?: string;
      organizationRole?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
    };
  }
}