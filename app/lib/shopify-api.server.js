/**
 * Shopify Admin GraphQL API helpers.
 * All functions take the `admin` client from `authenticate.admin(request)`.
 */

/**
 * Search products by query string.
 * @param {object} admin - The admin GraphQL client from authenticate.admin
 * @param {string} query - Search query
 * @returns {Promise<Array<{id: string, title: string, handle: string, imageUrl: string|null}>>}
 */
export async function searchProducts(admin, query = "") {
  const response = await admin.graphql(
    `#graphql
      query searchProducts($query: String!) {
        products(first: 25, query: $query) {
          edges {
            node {
              id
              title
              handle
              featuredMedia {
                preview {
                  image {
                    url
                    altText
                  }
                }
              }
              totalVariants
            }
          }
        }
      }
    `,
    { variables: { query } }
  );

  const data = await response.json();
  return (data?.data?.products?.edges || []).map(({ node }) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    imageUrl: node.featuredMedia?.preview?.image?.url || null,
    totalVariants: node.totalVariants,
  }));
}

/**
 * Fetch a single product by ID.
 * @param {object} admin - The admin GraphQL client from authenticate.admin
 * @param {string} productId - Shopify GID (e.g. "gid://shopify/Product/123")
 * @returns {Promise<{id: string, title: string, description: string, imageUrl: string|null, variants: Array}>}
 */
export async function getProduct(admin, productId) {
  const response = await admin.graphql(
    `#graphql
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          descriptionHtml
          featuredMedia {
            preview {
              image {
                url
                altText
              }
            }
          }
          variants(first: 50) {
            edges {
              node {
                id
                title
                price
                sku
              }
            }
          }
        }
      }
    `,
    { variables: { id: productId } }
  );

  const data = await response.json();
  const product = data?.data?.product;
  if (!product) return null;

  return {
    id: product.id,
    title: product.title,
    description: product.descriptionHtml,
    imageUrl: product.featuredMedia?.preview?.image?.url || null,
    variants: (product.variants?.edges || []).map(({ node }) => ({
      id: node.id,
      title: node.title,
      price: node.price,
      sku: node.sku,
    })),
  };
}

/**
 * Search collections by query string.
 * @param {object} admin - The admin GraphQL client
 * @param {string} query - Search query
 * @returns {Promise<Array<{id: string, title: string, handle: string}>>}
 */
export async function searchCollections(admin, query = "") {
  const response = await admin.graphql(
    `#graphql
      query searchCollections($query: String!) {
        collections(first: 25, query: $query) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    `,
    { variables: { query } }
  );

  const data = await response.json();
  return (data?.data?.collections?.edges || []).map(({ node }) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
  }));
}
