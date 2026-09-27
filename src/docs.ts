import type { Side } from "./types";

const BASE = import.meta.env.BASE_URL;

const KODOKAN_LIST = "https://web.archive.org/web/20120415033928/http://www.kodokan.org/e_waza/index.html";
const IJF_TEXT = "https://www.britishjudo.org.uk/wp-content/uploads/2025/11/IJF-Kodokan-Classification-of-Judo.pdf";

type Entry = {
  id: string;
  title: string;
  japanese: string;
  meta: string;
  body: string;
};

const ENTRIES: Entry[] = [
  {
    id: "o-goshi",
    title: "O-goshi",
    japanese: "大腰",
    meta: "Koshi-waza · dai-ikkyo · 6th of the 1920 Go-kyo",
    body: "Large hip throw. Break balance toward the front or the front corner, bring the hip in deep enough to lift, and turn them over that hip. The hip is the throwing part. The arms keep the fit; they do not replace it.",
  },
  {
    id: "ippon-seoi-nage",
    title: "Ippon-seoi-nage",
    japanese: "一本背負投",
    meta: "Te-waza · named by the Kodokan on 1 April 1997",
    body: "One-armed shoulder throw. Float the balance forward, turn, and fit one arm up under the armpit to the sleeve or the shoulder, then load them on the back and throw over that shoulder. The throwing arm stays bent. Dropping a knee is seoi-otoshi, a different technique.",
  },
  {
    id: "osoto-gari",
    title: "O-soto-gari",
    japanese: "大外刈",
    meta: "Ashi-waza · dai-ikkyo · 5th of the 1920 Go-kyo",
    body: "Large outer reap. Break balance to the rear or the rear corner so the weight sits on the heel, then reap that leg from the outside with your leg. The chest follows the reap. A bent swinging leg only taps.",
  },
  {
    id: "uchi-mata",
    title: "Uchi-mata",
    japanese: "内股",
    meta: "Ashi-waza · dai-nikyo · 8th of the 1920 Go-kyo",
    body: "Inner-thigh reap. Open the stance a little, break balance forward so the upper body comes with it, and sweep the inner thigh with the back of your thigh while you turn. The support leg stays down. The reap is the back of the thigh, not the shin.",
  },
  {
    id: "de-ashi-barai",
    title: "De-ashi-harai",
    japanese: "出足払",
    meta: "Ashi-waza · dai-ikkyo · 1st of the 1920 Go-kyo",
    body: "Forward foot sweep. Sweep the foot that is stepping, at the moment it is about to take the weight, from the side, the front, or behind. The sweeping leg stays long and the body stays up. The standing foot keeps the weight.",
  },
];

export function fillDocs(
  root: HTMLElement,
  throwId: string,
  side: Side,
  onThrow: (id: string) => void,
  onClose: () => void,
): void {
  root.replaceChildren();
  const bar = document.createElement("div");
  bar.className = "docs-bar";
  const back = document.createElement("button");
  back.type = "button";
  back.textContent = "Back";
  back.addEventListener("click", onClose);
  bar.append(back);
  root.append(bar);
  root.append(heading("Nage-waza", "投技"));
  root.append(para(
    "A throw, in the Kodokan dictionary, is kuzushi, then tsukuri, then kake: break the balance, set your body in, then execute. Tori is the person throwing. Uke is the person being thrown. These five are the standing throws in this drill, cut from the full illustration sheet.",
  ));
  const list = document.createElement("div");
  list.className = "doc-list";
  for (const entry of ENTRIES) {
    const article = document.createElement("article");
    if (side === "left") article.className = "mirror";
    if (entry.id === throwId) article.id = "doc-current";
    const image = document.createElement("img");
    image.src = `${BASE}illustrations/${entry.id}.png`;
    image.alt = `${entry.title}, blue gi and white gi.`;
    article.append(image);
    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "pick";
    pick.textContent = `${entry.title}  ${entry.japanese}`;
    pick.addEventListener("click", () => onThrow(entry.id));
    article.append(pick);
    article.append(para(entry.meta, "meta"));
    article.append(para(entry.body));
    list.append(article);
  }
  root.append(list);
  root.append(sources());
  const current = root.querySelector("#doc-current");
  if (current) current.scrollIntoView({ block: "start" });
}

function sources(): HTMLElement {
  const block = document.createElement("p");
  block.className = "source";
  block.append("Names, groups, and the actions follow the Kodokan New Japanese–English Dictionary of Judo (Kawamura and Daigo, Kodokan Judo Institute, 2000), as given in the ");
  block.append(link("IJF Academy classification", IJF_TEXT));
  block.append(" published by British Judo, using the Kodokan list of 1 April 2017. Go-kyo order is the Kodokan’s own ");
  block.append(link("classification of waza", KODOKAN_LIST));
  block.append(". The drawings are by Michael Hultström, CC BY-SA, cut from the sheet of the full throw set. A throw belongs on a mat, with someone who knows how to fall.");
  return block;
}

function heading(title: string, japanese: string): HTMLElement {
  const node = document.createElement("h2");
  node.append(title);
  node.append(" ");
  const jp = document.createElement("span");
  jp.className = "jp";
  jp.textContent = japanese;
  node.append(jp);
  return node;
}

function para(text: string, className?: string): HTMLElement {
  const node = document.createElement("p");
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function link(text: string, href: string): HTMLAnchorElement {
  const node = document.createElement("a");
  node.href = href;
  node.target = "_blank";
  node.rel = "noreferrer";
  node.textContent = text;
  return node;
}
