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

import { parallel, map } from "async";
import DynamicDictionaries from "../dict/DynamicDictionaries";

function join(...path) {
	return path.join("/");
}

/**
 * DictionaryLoader base constructor
 * @param {string} dic_path Dictionary path
 * @constructor
 */
function DictionaryLoader(dic_path) {
	this.dic = new DynamicDictionaries();
	this.dic_path = dic_path;
}

DictionaryLoader.prototype.loadArrayBuffer = function (file, callback) {
	throw new Error("DictionaryLoader#loadArrayBuffer should be overwrite");
};

/**
 * Load dictionary files
 * @param {DictionaryLoader~onLoad} load_callback Callback function called after loaded
 */
DictionaryLoader.prototype.load = function (load_callback) {
	const dic = this.dic;
	const dic_path = this.dic_path;
	const loadArrayBuffer = this.loadArrayBuffer;

	parallel(
		[
			// Trie
			function (callback) {
				map(
					["base.dat", "check.dat"],
					function (filename, _callback) {
						loadArrayBuffer(join(dic_path, filename), function (err, buffer) {
							if (err) {
								return _callback(err);
							}
							_callback(null, buffer);
						});
					},
					function (err, buffers) {
						if (err) {
							return callback(err);
						}
						const base_buffer = new Int32Array(buffers[0]);
						const check_buffer = new Int32Array(buffers[1]);

						dic.loadTrie(base_buffer, check_buffer);
						callback(null);
					},
				);
			},
			// Token info dictionaries
			function (callback) {
				map(
					["tid.dat", "tid_pos.dat", "tid_map.dat"],
					function (filename, _callback) {
						loadArrayBuffer(join(dic_path, filename), function (err, buffer) {
							if (err) {
								return _callback(err);
							}
							_callback(null, buffer);
						});
					},
					function (err, buffers) {
						if (err) {
							return callback(err);
						}
						const token_info_buffer = new Uint8Array(buffers[0]);
						const pos_buffer = new Uint8Array(buffers[1]);
						const target_map_buffer = new Uint8Array(buffers[2]);

						dic.loadTokenInfoDictionaries(
							token_info_buffer,
							pos_buffer,
							target_map_buffer,
						);
						callback(null);
					},
				);
			},
			// Connection cost matrix
			function (callback) {
				loadArrayBuffer(join(dic_path, "cc.dat"), function (err, buffer) {
					if (err) {
						return callback(err);
					}
					const cc_buffer = new Int16Array(buffer);
					dic.loadConnectionCosts(cc_buffer);
					callback(null);
				});
			},
			// Unknown dictionaries
			function (callback) {
				map(
					[
						"unk.dat",
						"unk_pos.dat",
						"unk_map.dat",
						"unk_char.dat",
						"unk_compat.dat",
						"unk_invoke.dat",
					],
					function (filename, _callback) {
						loadArrayBuffer(join(dic_path, filename), function (err, buffer) {
							if (err) {
								return _callback(err);
							}
							_callback(null, buffer);
						});
					},
					function (err, buffers) {
						if (err) {
							return callback(err);
						}
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
						// dic.loadUnknownDictionaries(char_buffer, unk_buffer);
						callback(null);
					},
				);
			},
		],
		function (err) {
			load_callback(err, dic);
		},
	);
};

/**
 * Callback
 * @callback DictionaryLoader~onLoad
 * @param {Object} err Error object
 * @param {DynamicDictionaries} dic Loaded dictionary
 */

export default DictionaryLoader;
