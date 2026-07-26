import type { JsonLd } from "@/lib/seo/structured-data";

/**
 * Emits schema.org markup into the document.
 *
 * Server component by design: crawlers that do not execute JavaScript still
 * need to see this, so it must arrive in the initial HTML rather than being
 * injected on the client.
 */
export function JsonLdScript({ data }: { data: JsonLd | JsonLd[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Rendering trusted, locally-authored objects. JSON.stringify escapes
          // the quotes; the "<" replacement closes the one remaining hole, a
          // literal </script> inside a string value.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
