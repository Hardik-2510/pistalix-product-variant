/* eslint-disable no-unused-vars */
import React, { useState } from 'react';

const CustomSlider = ({ label, value, onChange, min = 0, max = 20, step = 1 }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', color: '#333' }}>{label}</span>
        <span style={{ fontSize: '14px', color: '#888' }}>{value}px</span>
      </div>
      <div style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
        {/* Unfilled dotted track */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '4px',
          background: 'repeating-linear-gradient(90deg, #e0e0e0, #e0e0e0 4px, transparent 4px, transparent 8px)',
          borderRadius: '2px',
          zIndex: 1
        }} />
        {/* Filled solid track */}
        <div style={{
          position: 'absolute',
          width: `${percentage}%`,
          height: '4px',
          background: '#222',
          borderRadius: '2px',
          zIndex: 2
        }} />
        {/* Range Input overlay */}
        <input 
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            width: '100%',
            margin: 0,
            WebkitAppearance: 'none',
            appearance: 'none',
            background: 'transparent',
            outline: 'none',
            zIndex: 3,
            cursor: 'pointer'
          }}
          className="custom-range-slider"
        />
      </div>
    </div>
  );
};

export default function BorderModifier({ value = {}, onChange }) {
  // Extract values from props with fallbacks
  const inputSize = value.inputSize !== undefined ? value.inputSize : 1;
  const inputRadius = value.inputRadius !== undefined ? value.inputRadius : 2;
  const dropdownSize = value.dropdownSize !== undefined ? value.dropdownSize : 1;
  const dropdownRadius = value.dropdownRadius !== undefined ? value.dropdownRadius : 2;
  const swatchSize = value.swatchSize !== undefined ? value.swatchSize : 1;
  const swatchRadius = value.swatchRadius !== undefined ? value.swatchRadius : 2;

  // Helper to handle changes and emit full object to parent
  const handleChange = (key, val) => {
    if (onChange) {
      onChange({ ...value, [key]: val });
    }
  };

  return (
    <div style={{
      backgroundColor: '#f9f9f9',
      border: '1px solid #e1e3e5',
      borderRadius: '8px',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Global CSS for the custom slider thumb */}
      <style>{`
        .custom-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #222;
          cursor: pointer;
        }
        .custom-range-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #222;
          cursor: pointer;
          border: none;
        }
      `}</style>

      {/* Header */}
      <div style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#202223',
        marginBottom: '16px'
      }}>
        Border
      </div>
      
      {/* Divider */}
      <div style={{
        height: '1px',
        backgroundColor: '#e1e3e5',
        marginBottom: '20px'
      }} />

      {/* Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '32px'
      }}>
        {/* Column 1: Input */}
        <div>
          <div style={{
            fontSize: '15px',
            fontWeight: '500',
            color: '#6d7175',
            marginBottom: '16px'
          }}>
            Input
          </div>
          <CustomSlider 
            label="Border size" 
            value={inputSize} 
            onChange={(val) => handleChange('inputSize', val)} 
          />
          <CustomSlider 
            label="Border radius" 
            value={inputRadius} 
            onChange={(val) => handleChange('inputRadius', val)} 
          />
        </div>

        {/* Column 2: Dropdown */}
        <div>
          <div style={{
            fontSize: '15px',
            fontWeight: '500',
            color: '#6d7175',
            marginBottom: '16px'
          }}>
            Dropdown
          </div>
          <CustomSlider 
            label="Border size" 
            value={dropdownSize} 
            onChange={(val) => handleChange('dropdownSize', val)} 
          />
          <CustomSlider 
            label="Border radius" 
            value={dropdownRadius} 
            onChange={(val) => handleChange('dropdownRadius', val)} 
          />
        </div>

        {/* Column 3: Swatch */}
        <div>
          <div style={{
            fontSize: '15px',
            fontWeight: '500',
            color: '#6d7175',
            marginBottom: '16px'
          }}>
            Swatch
          </div>
          <CustomSlider 
            label="Border size" 
            value={swatchSize} 
            onChange={(val) => handleChange('swatchSize', val)} 
          />
          <CustomSlider 
            label="Border radius" 
            value={swatchRadius} 
            onChange={(val) => handleChange('swatchRadius', val)} 
          />
        </div>
      </div>
    </div>
  );
}
