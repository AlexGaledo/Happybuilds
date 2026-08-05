/**
 * Renders a schema.org JSON-LD block.
 *
 * The `<` escape is not decoration: JSON.stringify output goes into the
 * document verbatim, so a title containing `</script>` would otherwise close
 * the tag early and put the rest of the payload into the page as markup.
 * Replacing `<` with its unicode escape is valid JSON and valid JSON-LD, and
 * removes the possibility entirely.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
