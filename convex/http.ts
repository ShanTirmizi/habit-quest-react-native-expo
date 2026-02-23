import { httpRouter } from 'convex/server';
import { auth } from './auth';

const http = httpRouter();

// Add Convex Auth HTTP routes
auth.addHttpRoutes(http);

export default http;
