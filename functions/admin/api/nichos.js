import { listaNichos } from "../../_niches.js";

export async function onRequestGet() {
  return Response.json({ nichos: listaNichos() });
}
