import bed from "@/assets/room/bed.png.asset.json";
import beanbag from "@/assets/room/beanbag.png.asset.json";
import books from "@/assets/room/books.png.asset.json";
import bookshelf from "@/assets/room/bookshelf.png.asset.json";
import cabinet from "@/assets/room/cabinet.png.asset.json";
import chair from "@/assets/room/chair.png.asset.json";
import coffeeTable from "@/assets/room/coffee-table.png.asset.json";
import couch from "@/assets/room/couch.png.asset.json";
import desk from "@/assets/room/desk.png.asset.json";
import lamp from "@/assets/room/lamp.png.asset.json";
import plant from "@/assets/room/plant.png.asset.json";
import rug from "@/assets/room/rug.png.asset.json";
import starBed from "@/assets/room/star-bed.png.asset.json";
import table from "@/assets/room/table.png.asset.json";
import windowArt from "@/assets/room/window.png.asset.json";

/** Hand-drawn isometric artwork for room items, keyed by catalog item key. */
export const ROOM_ART: Record<string, string> = {
  bed: bed.url,
  "star-bed": starBed.url,
  couch: couch.url,
  chair: chair.url,
  table: table.url,
  "coffee-table": coffeeTable.url,
  bookshelf: bookshelf.url,
  cabinet: cabinet.url,
  desk: desk.url,
  "starter-plant": plant.url,
  "potted-plant": plant.url,
  rug: rug.url,
  lamp: lamp.url,
  beanbag: beanbag.url,
  "book-stack": books.url,
  window: windowArt.url,
};

export function artFor(key: string) {
  return ROOM_ART[key];
}
