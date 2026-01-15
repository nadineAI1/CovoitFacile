import * as React from 'react';
import { CommonActions } from '@react-navigation/native';

// Global navigation ref used across the app
export const navigationRef = React.createRef();

// Internal pending route (kept if nav not ready yet)
let _pendingResetRoute = null;

/**
 * Navigate to a screen (safe: does nothing if nav not ready)
 */
export function navigate(name, params) {
  if (navigationRef.current && typeof navigationRef.current.navigate === 'function') {
    navigationRef.current.navigate(name, params);
    return true;
  }
  console.warn('navigate: navigation not ready', name);
  return false;
}

/**
 * Replace current route with another
 */
export function replace(name, params) {
  if (navigationRef.current && typeof navigationRef.current.dispatch === 'function') {
    navigationRef.current.dispatch(CommonActions.replace(name, params));
    return true;
  }
  console.warn('replace: navigation not ready', name);
  return false;
}

/**
 * Reset the root navigator to a single route.
 * If navigation is not ready, store it in pending so it can be applied later.
 */
export function resetRoot(name) {
  if (navigationRef.current && typeof navigationRef.current.dispatch === 'function') {
    try {
      navigationRef.current.dispatch(CommonActions.reset({ index: 0, routes: [{ name }] }));
      _pendingResetRoute = null;
      return true;
    } catch (err) {
      console.warn('resetRoot dispatch failed, deferring', err);
      _pendingResetRoute = name;
      return false;
    }
  }
  // nav not ready yet — remember the route to apply later
  _pendingResetRoute = name;
  return false;
}

/**
 * Safe alias used by components (for example LogoutButton).
 * Returns true if dispatched immediately, false if deferred.
 */
export function safeResetRoot(name) {
  return resetRoot(name);
}

/**
 * Apply pending reset if any and nav is ready.
 * Call this from your NavigationContainer onReady (for example in App.js).
 */
export function applyPendingResetIfAny() {
  if (_pendingResetRoute && navigationRef.current && typeof navigationRef.current.dispatch === 'function') {
    try {
      navigationRef.current.dispatch(CommonActions.reset({ index: 0, routes: [{ name: _pendingResetRoute }] }));
    } catch (err) {
      console.warn('applyPendingResetIfAny failed', err);
    } finally {
      _pendingResetRoute = null;
    }
  }
}

/**
 * Optional helper to clear any pending route (if you want to cancel)
 */
export function clearPendingReset() {
  _pendingResetRoute = null;
}