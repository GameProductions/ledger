import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * GameProductions Foundation Identity Head (v1.3.0)
 * Centralized component for dynamic branding assets.
 * Enforces use of the specific app logo for Favicons, OG Tags, and Shortcuts.
 */
export const IdentityHead = (props) => {
    const { name = props.appName || '', description = props.appDescription || '', logoUrl = props.appLogo || '', url = props.appUrl || '', overrides } = props;
    const displayTitle = overrides?.title || name;
    const displayDescription = overrides?.description || description;
    const displayImage = overrides?.imageUrl || logoUrl;
    return (_jsxs(_Fragment, { children: [_jsx("title", { children: displayTitle }), _jsx("meta", { name: "description", content: displayDescription }), _jsx("link", { rel: "icon", type: "image/png", href: logoUrl }), _jsx("link", { rel: "apple-touch-icon", href: logoUrl }), _jsx("meta", { name: "mobile-web-app-capable", content: "yes" }), _jsx("meta", { name: "apple-mobile-web-app-title", content: name }), _jsx("meta", { property: "og:type", content: "website" }), _jsx("meta", { property: "og:url", content: url }), _jsx("meta", { property: "og:title", content: displayTitle }), _jsx("meta", { property: "og:description", content: displayDescription }), _jsx("meta", { property: "og:image", content: displayImage }), _jsx("meta", { name: "twitter:card", content: "summary_large_image" }), _jsx("meta", { name: "twitter:url", content: url }), _jsx("meta", { name: "twitter:title", content: displayTitle }), _jsx("meta", { name: "twitter:description", content: displayDescription }), _jsx("meta", { name: "twitter:image", content: displayImage })] }));
};
