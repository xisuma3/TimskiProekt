// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// react-router v7 needs these at import time; some jsdom setups don't provide them.
Object.assign(global, { TextEncoder, TextDecoder });

// Radix measures some primitives (Checkbox, Switch and RadioGroup inside a <form>,
// ScrollArea) with ResizeObserver, which jsdom doesn't implement.
if (!global.ResizeObserver) {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
