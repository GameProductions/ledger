// @ts-nocheck
/** @jsxImportSource react */



import React, { useState } from 'react';

type OGMetadata = {
  title: string;
  description: string;
  imageUrl: string;
};

/**
 * Foundation OG Meta Tag Editor (v1.3.0)
 * Admin-only UI for overriding app-sharing metadata.
 * Part of the God Mode Branding suite.
 */
export const OGEditor = ({ initialMetadata, onSave }: { initialMetadata: OGMetadata, onSave: (data: OGMetadata) => void }) => {
  const [metadata, setMetadata] = useState(initialMetadata);

  return (
    <div className="gp-og-editor">
      <h3>Social Metadata (Open Graph)</h3>
      <p className="description">Customize how {metadata.title} appears when shared on social media.</p>

      <div className="form-group">
        <label>Share Title</label>
        <input 
          type="text" 
          value={metadata.title} 
          onChange={(e) => setMetadata({...metadata, title: e.target.value})} 
          placeholder="Override App Name..."
        />
      </div>

      <div className="form-group">
        <label>Share Description</label>
        <textarea 
          value={metadata.description} 
          onChange={(e) => setMetadata({...metadata, description: e.target.value})} 
          placeholder="Custom sharing description..."
        />
      </div>

      <div className="form-group">
        <label>Share Image URL</label>
        <input 
          type="text" 
          value={metadata.imageUrl} 
          onChange={(e) => setMetadata({...metadata, imageUrl: e.target.value})} 
          placeholder="URL to custom 1200x630 image..."
        />
      </div>

      <div className="preview-card">
        <div className="preview-image" style={{ backgroundImage: `url(${metadata.imageUrl})` }}></div>
        <div className="preview-content">
          <h4>{metadata.title || 'Sharing Preview'}</h4>
          <p>{metadata.description || 'App description will appear here...'}</p>
        </div>
      </div>

      <button className="btn-primary" onClick={() => onSave(metadata)}>
        Update Social Assets
      </button>
    </div>
  );
};
