import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * GameProductions Foundation Service Linker (v1.3.0)
 * Centralized interface for linking and managing 3rd party APIs.
 * Supports dynamic redirect construction with app-specific scopes.
 */
export const ServiceLinker = ({ services, onConnect, onDisconnect }) => {
    return (_jsxs("div", { className: "gp-service-linker", children: [_jsx("h3", { children: "Integration Core" }), _jsx("p", { className: "description", children: "Link your project to GameProductions-approved services." }), _jsx("div", { className: "service-registry", children: services.map((service) => (_jsxs("div", { className: `service-card ${service.isConnected ? 'connected' : 'disconnected'}`, children: [_jsxs("div", { className: "service-header", children: [_jsx("img", { src: service.logo, alt: service.name }), _jsx("h4", { children: service.name }), _jsx("span", { className: `status-badge ${service.isConnected ? 'on' : 'off'}`, children: service.isConnected ? 'Connected' : 'Ready to Link' })] }), _jsxs("div", { className: "service-body", children: [_jsxs("div", { className: "scopes-info", children: [_jsx("span", { children: "Required Scopes:" }), _jsx("code", { children: service.requiredScopes.join(', ') })] }), service.isConnected ? (_jsx("button", { className: "btn-disconnect", onClick: () => onDisconnect(service.id), children: "Unlink Service" })) : (_jsxs("button", { className: "btn-primary", onClick: () => onConnect(service.id, service.requiredScopes), children: ["Link with ", service.name] }))] })] }, service.id))) })] }));
};
