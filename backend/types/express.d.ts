import { AuthObject } from '@clerk/clerk-sdk-node';
import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthObject;
  }
}