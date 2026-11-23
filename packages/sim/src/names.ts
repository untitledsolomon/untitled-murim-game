import { rngPick } from "./rng";
import type { Rng } from "./rng";

const SURNAMES: readonly string[] = [
  "Chen", "Li", "Wang", "Zhang", "Liu", "Zhao", "Sun", "Zhou",
  "Wu", "Zheng", "Ma", "Qian", "Xu", "Feng", "Yang", "Jiang",
];

const GIVEN_A: readonly string[] = [
  "Wen", "De", "Fu", "Cai", "Hong", "Ming", "An", "Kang",
  "Shun", "Rui", "Qing", "Zhi", "Xin", "Yong", "Jing", "Zhao",
];

const GIVEN_B: readonly string[] = [
  "lin", "fu", "de", "shan", "ping", "hua", "guo", "wei",
];

const COUNTY_SUFFIXES: readonly string[] = ["fu", "zhou", "jun", "guo"];
const TOWN_SUFFIXES: readonly string[] = ["zhen", "ji", "guan", "du", "zhuang"];
const BASE_WORDS: readonly string[] = [
  "Hua", "Yun", "Xue", "Feng", "Song", "Mei", "Lan",
  "Jin", "Yu", "Tian", "Shui", "Dan", "Qing", "Chao", "Yan",
];

const SECT_SUFFIXES: readonly string[] = ["Bang", "Pai", "Men", "Gong", "Dian"];
const MERCHANT_SUFFIXES: readonly string[] = ["Hao", "Jie", "Liang", "Fang", "Hang"];
const BANK_SUFFIXES: readonly string[] = ["Piaohao", "Qianzhuang", "Tong"];
const ESCORT_SUFFIXES: readonly string[] = ["Biaoju", "Zhan", "Fang"];

export interface NameGen {
  person(): string;
  county(): string;
  town(): string;
  sect(): string;
  merchantHouse(): string;
  bank(): string;
  escort(): string;
}

/** Create a name generator over one RNG, so names are deterministic per seed. */
export function makeNameGen(rng: Rng): NameGen {
  const pick = (values: readonly string[]) => rngPick(rng, values);
  const base = () => pick(BASE_WORDS);
  return {
    person: () => pick(SURNAMES) + pick(GIVEN_A) + pick(GIVEN_B),
    county: () => base() + pick(COUNTY_SUFFIXES),
    town: () => base() + pick(TOWN_SUFFIXES),
    sect: () => base() + pick(SECT_SUFFIXES),
    merchantHouse: () => base() + pick(MERCHANT_SUFFIXES),
    bank: () => base() + pick(BANK_SUFFIXES),
    escort: () => base() + pick(ESCORT_SUFFIXES),
  };
}
