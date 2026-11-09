import type { CSSProperties } from "react";
export type IconName =
  | "inventory"
  | "robots"
  | "shop"
  | "code"
  | "info"
  | "research"
  | "zoom"
  | "home"
  | "play"
  | "pause"
  | "stop"
  | "close"
  | "minimize"
  | "expand"
  | "flag"
  | "arrow"
  | "reset";
const paths: Record<IconName, string> = {
  inventory: "m3 7 9-4 9 4v12l-9 4-9-4Zm0 0 9 4 9-4M12 11v12M7 5l10 4",
  robots:
    "M8 8h8v8H8ZM12 5V3M4 12H2M22 12h-2M5 20h14M7 16v4M17 16v4M10 11h.1M14 11h.1",
  shop: "M3 8h18l-2 12H5ZM7 8l5-6 5 6M9 12v5M15 12v5",
  code: "m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18",
  info: "M12 11v7M12 6v1M9 18h6M10 11h2",
  research: "m5 13 7-7 7 7M5 20l7-7 7 7",
  zoom: "m16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  home: "m3 11 9-8 9 8M6 10v11h5v-7h3v7h4V10",
  play: "m8 4 13 8-13 8Z",
  pause: "M8 4v16M16 4v16",
  stop: "M5 5h14v14H5Z",
  close: "m6 6 12 12M6 18 18 6",
  minimize: "M5 12h14",
  expand: "M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5",
  flag: "M5 21V3c6-4 8 4 15 0v10c-7 4-9-4-15 0",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  reset: "M3 10a9 9 0 1 1 1 8M3 3v7h7",
};
export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === "play" || name === "stop" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={name === "pause" ? 4 : 2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function ResourceIcon({
  kind,
  style,
}: {
  kind: "hay" | "wheat" | "wood" | "carrot" | "water";
  style?: CSSProperties;
}) {
  return (
    <svg
      style={style}
      className="resource-art"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <ellipse cx="53" cy="86" rx="29" ry="6" fill="#263b43" opacity=".2" />
      {kind === "hay" && (
        <g stroke="#87712a" strokeWidth="1.4" strokeLinejoin="round">
          <path fill="#c0a744" d="m17 48 35-8 24 12-4 29-37 8-20-11Z" />
          <path fill="#ead06a" d="m17 48 23 10 36-6-24-12Z" />
          <path fill="#f2d55e" d="m17 48 23 10-5 31-20-11Z" />
          <path fill="#d9b746" d="m40 58 36-6-4 29-37 8Z" />
          <path
            fill="#b18c29"
            d="m25 51 4 2-4 31 4 2 5-31-4-2ZM55 55l4-1-4 31-4 1Z"
          />
          <path fill="#e4c35a" d="m31 20 33-6 14 12-1 29-33 7-15-13Z" />
          <path fill="#f4dc79" d="m31 20 15 10 32-4-14-12Z" />
          <path fill="#f1d466" d="m31 20 15 10-2 32-15-13Z" />
          <path fill="#ccb04a" d="m46 30 32-4-1 29-33 7Z" />
          <path fill="#aa8428" d="m49 17 4-1 4 11-3 1ZM54 28l3-1-1 32-4 1Z" />
        </g>
      )}
      {kind === "wheat" && (
        <g stroke="#946c21" strokeWidth="2" strokeLinecap="round">
          <path d="M33 85L56 19M49 88L73 34M23 74L37 31" fill="none" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g
              key={i}
              transform={`translate(${54 - i * 4} ${23 + i * 11}) rotate(20)`}
            >
              <ellipse
                cx="-6"
                cy="0"
                rx="5"
                ry="9"
                fill="#edc951"
                transform="rotate(-35 -6 0)"
              />
              <ellipse
                cx="6"
                cy="5"
                rx="5"
                ry="9"
                fill="#ffd967"
                transform="rotate(35 6 5)"
              />
            </g>
          ))}
        </g>
      )}
      {kind === "wood" && (
        <g stroke="#45270e" strokeWidth="2" strokeLinejoin="round">
          <path fill="#74350f" d="m19 61 48-30 17 8 5 17-49 31-16-9Z" />
          <path fill="#a75520" d="m22 62 48-30 14 7-49 32Z" />
          <path fill="#67320f" d="m35 71 49-32 5 17-49 31Z" />
          <path fill="#c18a41" d="m19 61 16 10 5 16-16-9-8-12Z" />
          <path fill="#70300e" d="m12 43 49-29 15 8 6 14-50 31-14-8Z" />
          <path fill="#a95720" d="m12 43 49-29 15 8-49 31Z" />
          <path fill="#4e260e" d="m27 53 49-31 6 14-50 31Z" />
          <path fill="#c98b40" d="m12 43 15 10 5 14-14-8-9-10Z" />
        </g>
      )}
      {kind === "carrot" && (
        <g strokeLinejoin="round">
          <path d="m53 35 12-21 5 14 13-10-5 21 13 7-22 5Z" fill="#697326" />
          <path d="m64 32-8-20-9 9 2 20Z" fill="#8c962d" />
          <path d="m45 39 18-13 15 18-60 43Z" fill="#e3a430" />
          <path d="m63 26 15 18-60 43Z" fill="#efc653" />
          <path d="m61 43 9-4-9 9Z" fill="#b27a22" />
          <path d="m45 43 12 9-43 25Z" fill="#d18e25" />
          <path d="m55 54 13 5-36 32Z" fill="#e7b440" />
        </g>
      )}
      {kind === "water" && (
        <g stroke="#50351d" strokeWidth="2" strokeLinejoin="round">
          <path
            fill="#865024"
            d="m28 23 35-7 18 18 2 23-9 24-32 4-19-20-4-23Z"
          />
          <path fill="#a05f2a" d="m23 38 17 17 35-4 8-17-20-18-35 7Z" />
          <path fill="#4b361f" d="m23 38 17 17 35-4 4-14-17-17-31 7Z" />
          <path fill="#246d58" d="m30 29 29-5 15 14-5 9-27 4-15-14Z" />
          <path fill="#5c351a" d="m22 55 20 17 36-5-4 14-32 4-19-20Z" />
          <path
            d="m20 44 20 17 40-6M24 66l19 13 33-4"
            fill="none"
            stroke="#382c1b"
            strokeWidth="4"
          />
        </g>
      )}
    </svg>
  );
}
