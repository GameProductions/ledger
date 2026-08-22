import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("tos", "routes/tos.tsx"),
  route("legal", "routes/legal.tsx"),
  route("legal/:tab", "routes/legal-tab.tsx"),
] satisfies RouteConfig;

