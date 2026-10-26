import type { StoreCategory } from "@/lib/domain/store";

type ClassifiablePoi = { name: string; typecode?: string };

const TEA_WORDS = /奶茶|茶饮|果茶|手作茶|鲜茶|茶坊|喜茶|奈雪|霸王茶姬|沪上阿姨|古茗|茶百道/i;
const COFFEE_WORDS = /咖啡|coffee|café|cafe/i;
const BEVERAGE_WORDS = /饮品|果汁|冷饮|冰饮|酸奶|椰子水/i;

function hasFamily(typecode: string, prefixes: string[]) {
  return typecode.split("|").some((code) => prefixes.some((prefix) => code.startsWith(prefix)));
}

export function classifyPoi(poi: ClassifiablePoi): StoreCategory | null {
  const typecode = poi.typecode ?? "";
  if (hasFamily(typecode, ["0501", "0502", "0503", "0504", "0602", "0604"])) return null;

  if (COFFEE_WORDS.test(poi.name) || hasFamily(typecode, ["050500"])) return "coffee";
  if (TEA_WORDS.test(poi.name)) return "tea_drink";
  if (BEVERAGE_WORDS.test(poi.name) || hasFamily(typecode, ["050700"])) return "beverage";
  return null;
}
