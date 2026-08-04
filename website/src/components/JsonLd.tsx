/**
 * Injeta um ou mais blocos JSON-LD numa página. Extraído porque o par
 * `<script type="application/ld+json" dangerouslySetInnerHTML>` estava
 * repetido (copy-paste) em 5 páginas — cada uma a montar 2 tags
 * praticamente idênticas à mão.
 */
export function JsonLd({ schemas }: { schemas: object[] }) {
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
