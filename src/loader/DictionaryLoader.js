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

import DynamicDictionaries from "../dict/DynamicDictionaries";

function join(...path) {
	return path.join("/");
}

class DictionaryLoader {
	/**
	 * @param {string} dic_path
	 */
	constructor(dic_path) {
		/**
		 * @type {DynamicDictionaries}
		 */
		this.dic = new DynamicDictionaries();
		/**
		 * @type {string}
		 */
		this.dic_path = dic_path;
	}

	/**
	 * @param {string} file
	 * @return {Promise<ArrayBufferLike>}
	 */
	async loadArrayBuffer(_file) {
		throw new Error("DictionaryLoader#loadArrayBuffer should be overwritten");
	}

	async load() {
		const dic = this.dic;
		const dic_path = this.dic_path;
		const loadArrayBuffer = this.loadArrayBuffer;
		const loadData = (/** @type {string} */ filename) =>
			loadArrayBuffer(join(dic_path, filename));

		await Promise.all([
			(async () => {
				const buffer = await loadData("cc.dat");
				const cc_buffer = new Int16Array(buffer);
				dic.loadConnectionCosts(cc_buffer);
			})(),
			(async () => {
				const [base_buffer, check_buffer] = await Promise.all(
					["base.dat", "check.dat"].map(loadData),
				);
				dic.loadTrie(new Uint8Array(base_buffer), new Uint8Array(check_buffer));
			})(),
			(async () => {
				const buffers = await Promise.all(
					[
						"unk.dat",
						"unk_pos.dat",
						"unk_map.dat",
						"unk_char.dat",
						"unk_compat.dat",
						"unk_invoke.dat",
					].map(loadData),
				);
				const unk_buffer = new Uint8Array(buffers[0]);
				const unk_pos_buffer = new Uint8Array(buffers[1]);
				const unk_map_buffer = new Uint8Array(buffers[2]);
				const cat_map_buffer = new Uint8Array(buffers[3]);
				const compat_cat_map_buffer = new Uint32Array(buffers[4]);
				const invoke_def_buffer = new Uint8Array(buffers[5]);

				dic.loadUnknownDictionaries(
					unk_buffer,
					unk_pos_buffer,
					unk_map_buffer,
					cat_map_buffer,
					compat_cat_map_buffer,
					invoke_def_buffer,
				);
			})(),
		]);

		return dic;
	}
}

export default DictionaryLoader;
