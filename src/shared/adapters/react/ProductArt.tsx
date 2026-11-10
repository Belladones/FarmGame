import { ResourceIcon } from "./Icons";
import { models } from "../../../modules/robots/domain/catalog";
import { buildings } from "../../../modules/construction/domain/catalog";
export function ProductArt({ kind }: { kind: string }) {
  if (kind === "Workshop")
    return (
      <svg className="product-art" viewBox="0 0 160 120" aria-hidden="true">
        <ellipse cx="82" cy="103" rx="59" ry="9" fill="#13232d" opacity=".25" />
        <path d="M17 81 78 54l68 31-59 29Z" fill="#80939e" />
        <path d="M28 77V33l57-22 48 24v49l-48 22Z" fill="#bbcbd2" />
        <path d="M31 36 83 17v79L31 75Z" fill="#334f61" />
        <path d="m85 18 45 20v45L85 103Z" fill="#d5e0e4" />
        <path d="M38 44 77 28v60L38 73Z" fill="#122733" />
        <path d="m19 28 66-23 58 29-10 10-49-22-56 22Z" fill="#314b5e" />
        <path d="m28 34 56-20 51 25-5 6-46-21-56 20Z" fill="#f18a38" />
        <path d="m42 79 35-14 39 18-33 19Z" fill="#213843" />
        <path
          d="M47 76V49l26-10v26m-29-13 32-13"
          fill="none"
          stroke="#ed953e"
          strokeWidth="5"
        />
        <path d="m54 80 25-10m-16 16 26-10" stroke="#93acb7" strokeWidth="5" />
        <path d="m107 49 13 6v13l-13-6Z" fill="#69e1dc" />
        <path
          d="m31 82 47 20"
          stroke="#e7c358"
          strokeWidth="5"
          strokeDasharray="5 4"
        />
      </svg>
    );

  if (["Wheat", "Wood", "Carrot"].includes(kind))
    return (
      <ResourceIcon kind={kind.toLowerCase() as "wheat" | "wood" | "carrot"} />
    );
  const isRobot = kind in models,
    drone = kind === "Drone",
    transporter = kind === "Transporter";
  return (
    <svg className="product-art" viewBox="0 0 160 120" aria-hidden="true">
      <ellipse cx="83" cy="103" rx="48" ry="8" fill="#293e43" opacity=".22" />
      {isRobot ? (
        <g stroke="#494a2a" strokeWidth="2" strokeLinejoin="round">
          {drone ? (
            <>
              <path
                d="M34 32l92 52M35 85l90-52"
                stroke="#6d6238"
                strokeWidth="8"
              />
              <ellipse cx="34" cy="32" rx="24" ry="5" fill="#485349" />
              <ellipse cx="126" cy="84" rx="24" ry="5" fill="#485349" />
              <ellipse cx="35" cy="85" rx="24" ry="5" fill="#485349" />
              <ellipse cx="125" cy="33" rx="24" ry="5" fill="#485349" />
              <path d="m55 46 32-9 23 22-10 21-33 6-21-19Z" fill="#bc9850" />
            </>
          ) : (
            <>
              <path d="m32 70 76-9 26 17-8 20-81 5-20-16Z" fill="#454d3c" />
              {[34, 107].map((x) => (
                <g key={x}>
                  <ellipse cx={x} cy="88" rx="14" ry="20" fill="#303b34" />
                  <ellipse cx={x} cy="88" rx="6" ry="10" fill="#8c9162" />
                </g>
              ))}
              <path
                d={
                  transporter
                    ? "m38 38 69-7 26 23-6 30-70 6-25-23Z"
                    : "m48 38 40-7 28 20-4 35-44 7-26-20Z"
                }
                fill={transporter ? "#b29459" : "#adb04e"}
              />
              <path
                d={
                  transporter
                    ? "m38 38 69-7 26 23-70 8Z"
                    : "m48 38 40-7 28 20-43 8Z"
                }
                fill="#d3c36f"
              />
              <path d="m74 58 30-5-1 13-28 5Z" fill="#3e645b" />
              {!transporter && (
                <>
                  <path d="m35 90-14 12h41l5-11" fill="#837949" />
                  <path
                    d="m21 102-4 10m18-10-2 10m18-10v9"
                    stroke="#454a38"
                    strokeWidth="4"
                  />
                </>
              )}
            </>
          )}
          <path d="m73 37 19-3 8 11-21 4Z" fill="#dbbf65" />
          <path d="m82 29 2-10" stroke="#555d3f" />
          <circle cx="84" cy="18" r="3" fill="#cadb7c" />
        </g>
      ) : kind in buildings ? (
        <g stroke="#5a4a30" strokeWidth="2" strokeLinejoin="round">
          <path
            d="m36 64 61-14 29 23v27l-63 10-27-22Z"
            fill={kind === "Cistern" || kind === "Well" ? "#8c5a2f" : "#bd9d67"}
          />
          <path d="m36 64 61-14 29 23-63 12Z" fill="#d0b775" />
          <path d="m63 85 63-12v27l-63 10Z" fill="#9d7e4b" />
          {kind === "Well" || kind === "Cistern" ? (
            <>
              <ellipse cx="81" cy="61" rx="36" ry="20" fill="#70502e" />
              <ellipse cx="81" cy="61" rx="28" ry="14" fill="#477c68" />
              <path
                d="M47 74q35 23 69-7M45 88q36 21 72-6"
                fill="none"
                stroke="#493c27"
                strokeWidth="4"
              />
              {kind === "Well" && (
                <path
                  d="M44 57V30l71-13v38M42 30l35-21 40 9-36 22Z"
                  fill="#a2a34a"
                />
              )}
            </>
          ) : (
            <>
              <path
                d="m27 59 42-33 67 19-18 34-54 11Z"
                fill={kind === "Oven" ? "#a5623c" : "#7e6844"}
              />
              <path d="m27 59 42-33-5 39Z" fill="#c3aa68" />
              <path d="M78 104V83l21-4v21" fill="#535841" />
              {kind === "Mill" && (
                <>
                  <path
                    d="m85 22-3 61m-29-41 61 22"
                    stroke="#e0cc87"
                    strokeWidth="8"
                  />
                  <circle cx="83" cy="53" r="6" fill="#6c673d" />
                </>
              )}
              {kind === "Oven" && <path d="M111 45V13h14v38" fill="#9c7656" />}
              {kind === "Sawmill" && (
                <path
                  d="m20 91 56-10m-52 16 56-10"
                  stroke="#cbaf65"
                  strokeWidth="8"
                />
              )}
              {kind === "Composter" && (
                <path d="m50 54 29-13 31 7-16 16-30 5Z" fill="#6a8540" />
              )}
              {kind === "Workshop" && (
                <path
                  d="m81 55 15-15m-4-6 8 3 3 8-9 3-6-6Z"
                  fill="#ccc591"
                  strokeWidth="4"
                />
              )}
            </>
          )}
        </g>
      ) : (
        <g stroke="#7b723d" strokeWidth="2" strokeLinejoin="round">
          {kind === "Bread" ? (
            <path d="M35 86q-4-38 44-46t49 37l-5 18-73 9Z" fill="#d9a54b" />
          ) : kind === "Pumpkin" ? (
            <>
              <path d="m76 45 7-20 10 2-6 22" fill="#718a3a" />
              <path
                d="M35 72q0-33 44-30t49 31q0 34-48 33T35 72Z"
                fill="#d38b31"
              />
              <path d="M67 44q-24 35 0 60m24-59q28 31 4 58" fill="none" />
            </>
          ) : kind === "Plank" ? (
            <path
              d="m27 61 80-24 26 21-80 26Zm0 15 80-24 26 21-80 26Z"
              fill="#c19a54"
            />
          ) : (
            <>
              <path
                d="m52 34 39-5 15 15 17 49-60 14-24-22 18-40Z"
                fill={kind === "Fertilizer" ? "#849943" : "#d3c49a"}
              />
              <path d="m53 34 38-5 5 12-41 7Z" fill="#aa9a69" />
              <path
                d="m67 65 22-5 9 15-20 9-15-9Z"
                fill={kind === "Fertilizer" ? "#c3ce72" : "#b2a173"}
              />
            </>
          )}
          {kind === "Bread" && (
            <path
              d="m65 53 7 22m13-27 8 21m10-19 8 17"
              stroke="#ae7c31"
              strokeWidth="4"
            />
          )}
        </g>
      )}
    </svg>
  );
}
