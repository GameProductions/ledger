import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("login", "routes/login.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("tos", "routes/tos.tsx"),
  route("terms", "routes/tos.tsx", { id: "routes/terms" }),
  route("legal", "routes/legal.tsx"),
  route("legal/:tab", "routes/legal-tab.tsx"),
] satisfies RouteConfig;

