/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// jshint node:true
'use strict';

import * as path from 'path';
import * as url from 'url';
import {parseUrl} from 'polymer-analyzer/lib/utils';
import constants from './constants';

const sharedRelativeUrlProperties =
    ['protocol', 'slashes', 'auth', 'host', 'port', 'hostname'];

/**
 * A string representing a URL.
 */
export type UrlString = string;

/**
 * Returns a URL with the basename removed from the pathname.  Strips the
 * search off of the URL as well, since it will not apply.
 */
export function stripUrlFileSearchAndHash(href: UrlString): UrlString {
  const u = url.parse(href);
  // Using != so tests for null AND undefined
  if (u.pathname != null) {
    // Suffix path with `_` so that `/a/b/` is treated as `/a/b/_` and that
    // `path.posix.dirname()` returns `/a/b` because it would otherwise
    // return `/a` incorrectly.
    u.pathname = path.posix.dirname(u.pathname + '_') + '/';
  }
  // Assigning to undefined because TSC says type of these is
  // `string | undefined` as opposed to `string | null`
  u.search = undefined;
  u.hash = undefined;
  return url.format(u);
}

/**
 * Returns true if the href is an absolute path.
 */
export function isAbsolutePath(href: UrlString): boolean {
  return constants.ABS_URL.test(href);
}

/**
 * Returns true if the href is a templated value, i.e. `{{...}}` or `[[...]]`
 */
export function isTemplatedUrl(href: UrlString): boolean {
  return href.search(constants.URL_TEMPLATE) >= 0;
}

/**
 * Computes the most succinct form of a relative URL representing the path from
 * the `fromUri` to the `toUri`.  Function is URL aware, not path-aware, so
 * `/a/` is correctly treated as a folder path where `/a` is not.
 */
export function relativeUrl(fromUri: UrlString, toUri: UrlString): UrlString {
  const fromUrl = parseUrl(fromUri)!;
  const toUrl = parseUrl(toUri)!;
  // Return the toUri as-is if there are conflicting components which
  // prohibit calculating a relative form.
  if (sharedRelativeUrlProperties.some(
          (p) => toUrl[p] !== null && fromUrl[p] !== toUrl[p])) {
    return toUri;
  }
  const fromDir = fromUrl.pathname !== undefined ?
      fromUrl.pathname.replace(/[^/]+$/, '') :
      '';
  const toDir = toUrl.pathname !== undefined ? toUrl.pathname : '';
  // Note, below, the _ character is appended so that paths with trailing
  // slash retain the trailing slash in the path.relative result.
  const relPath = path.posix.relative(fromDir, toDir + '_').replace(/_$/, '');
  sharedRelativeUrlProperties.forEach((p) => toUrl[p] = null);
  toUrl.path = undefined;
  toUrl.pathname = relPath;
  return url.format(toUrl);
}

/**
 * Modifies an href by the relative difference between the old base url and
 * the new base url.
 */
export function rewriteHrefBaseUrl(
    href: UrlString, oldBaseUrl: UrlString, newBaseUrl: UrlString): UrlString {
  if (isAbsolutePath(href)) {
    return href;
  }
  const absUrl = url.resolve(oldBaseUrl, href);
  const parsedFrom = url.parse(newBaseUrl);
  const parsedTo = url.parse(absUrl);
  if (parsedFrom.protocol === parsedTo.protocol &&
      parsedFrom.host === parsedTo.host) {
    const pathname = path.posix.relative(
        path.posix.dirname(parsedFrom.pathname || ''), parsedTo.pathname || '');
    return url.format(
        {pathname: pathname, search: parsedTo.search, hash: parsedTo.hash});
  }
  return absUrl;
}
