declare namespace Express {
  interface Request {
    auth?: {
      userId: string;
      email: string;
      token: string;
    };
  }
}
