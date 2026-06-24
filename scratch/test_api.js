import { loader } from "../app/routes/api.product-options.jsx";

async function run() {
  const req = new Request("http://localhost/api/product-options?productId=8785993892011&shop=varify-pov.myshopify.com");
  const res = await loader({ request: req });
  console.log(await res.json());
}

run();
