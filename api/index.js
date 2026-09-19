import { handleRequest } from "../server/server.js";

export default function handler(request, response) {
  return handleRequest(request, response);
}
