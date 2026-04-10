// @ts-nocheck
/** @jsxImportSource react */



import React from 'react';

type Service = {
  id: string;
  name: string;
  logo: string;
  isConnected: boolean;
  requiredScopes: string[];
};

/**
 * Foundation Service Linker (v1.3.0)
 * Centralized interface for linking and managing 3rd party APIs.
 * Supports dynamic redirect construction with app-specific scopes.
 */
export const ServiceLinker = ({ services, onConnect, onDisconnect }: { services: Service[] }) => {
  return (
    <div className="gp-service-linker">
      <h3>Integration Core</h3>
      <p className="description">Link your project to GameProductions-approved services.</p>

      <div className="service-registry">
        {services.map((service) => (
          <div key={service.id} className={`service-card ${service.isConnected ? 'connected' : 'disconnected'}`}>
            <div className="service-header">
              <img src={service.logo} alt={service.name} />
              <h4>{service.name}</h4>
              <span className={`status-badge ${service.isConnected ? 'on' : 'off'}`}>
                {service.isConnected ? 'Connected' : 'Ready to Link'}
              </span>
            </div>

            <div className="service-body">
              <div className="scopes-info">
                <span>Required Scopes:</span>
                <code>{service.requiredScopes.join(', ')}</code>
              </div>

              {service.isConnected ? (
                <button 
                  className="btn-disconnect" 
                  onClick={() => onDisconnect(service.id)}
                >
                  Unlink Service
                </button>
              ) : (
                <button 
                  className="btn-primary" 
                  onClick={() => onConnect(service.id, service.requiredScopes)}
                >
                  Link with {service.name}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
