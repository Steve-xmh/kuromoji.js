/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

import { decompress } from "fflate";
import DictionaryLoader from "./DictionaryLoader";

/**
 * @param {ArrayBufferLike} buffer
 * @returns {Promise<ArrayBufferLike>}
 */
function decompressAsync(buffer) {
	return new Promise((resolve, reject) => {
		decompress(
			new Uint8Array(buffer),
			{
				consume: true,
			},
			function (err, typed_array) {
				if (err) {
					reject(err);
				} else {
					resolve(typed_array.buffer);
				}
			},
		);
	});
}

/**
 * BrowserDictionaryLoader inherits DictionaryLoader, using fetch api for download
 * @param {string} dic_path Dictionary path
 * @constructor
 */
class BrowserDictionaryLoader extends DictionaryLoader {
	/**
	 * @override
	 * @param {string} url
	 * @returns {Promise<ArrayBufferLike>}
	 */
	async loadArrayBuffer(url) {
		const res = await fetch(url);
		if (!res.ok) throw new Error(res.statusText);
		const data = await res.arrayBuffer();
		const decompressed = await decompressAsync(data);
		return decompressed;
	}
}

export default BrowserDictionaryLoader;
