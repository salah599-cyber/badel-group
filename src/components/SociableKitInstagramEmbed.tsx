import Script from "next/script";
import { getSociableKitEmbedId, getSociableKitFeedScriptUrl } from "@/lib/instagram";

export function SociableKitInstagramEmbed() {
  const embedId = getSociableKitEmbedId();

  return (
    <>
      <div
        className="sk-instagram-feed min-h-[280px] overflow-hidden rounded-2xl"
        data-embed-id={embedId}
      />
      <Script src={getSociableKitFeedScriptUrl()} strategy="lazyOnload" />
    </>
  );
}
