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

import ByteBuffer from "../util/ByteBuffer";

/**
 * TokenInfoDictionary
 * @constructor
 */
function TokenInfoDictionary() {
	this.dictionary = new ByteBuffer(10 * 1024 * 1024);
	this.target_map = {}; // trie_id (of surface form) -> token_info_id (of token)
	this.pos_buffer = new ByteBuffer(10 * 1024 * 1024);
}

// left_id right_id word_cost ...
// ^ this position is token_info_id
TokenInfoDictionary.prototype.buildDictionary = function (entries) {
	const dictionary_entries = {}; // using as hashmap, string -> string (word_id -> surface_form) to build dictionary

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];

		if (entry.length < 4) {
			continue;
		}

		const surface_form = entry[0];
		const left_id = entry[1];
		const right_id = entry[2];
		const word_cost = entry[3];
		const feature = entry.slice(4).join(","); // TODO Optimize

		// Assertion
		if (!(isFinite(left_id) && isFinite(right_id) && isFinite(word_cost))) {
			console.log(entry);
		}

		const token_info_id = this.put(
			left_id,
			right_id,
			word_cost,
			surface_form,
			feature,
		);
		dictionary_entries[token_info_id] = surface_form;
	}

	// Remove last unused area
	this.dictionary.shrink();
	this.pos_buffer.shrink();

	return dictionary_entries;
};

TokenInfoDictionary.prototype.put = function (
	left_id,
	right_id,
	word_cost,
	surface_form,
	feature,
) {
	const token_info_id = this.dictionary.position;
	const pos_id = this.pos_buffer.position;

	this.dictionary.putShort(left_id);
	this.dictionary.putShort(right_id);
	this.dictionary.putShort(word_cost);
	this.dictionary.putInt(pos_id);
	this.pos_buffer.putString(`${surface_form},${feature}`);

	return token_info_id;
};

TokenInfoDictionary.prototype.addMapping = function (source, target) {
	let mapping = this.target_map[source];
	if (mapping == null) {
		mapping = [];
	}
	mapping.push(target);

	this.target_map[source] = mapping;
};

TokenInfoDictionary.prototype.targetMapToBuffer = function () {
	const buffer = new ByteBuffer();
	const map_keys_size = Object.keys(this.target_map).length;
	buffer.putInt(map_keys_size);
	for (const key in this.target_map) {
		const values = this.target_map[key]; // Array
		const map_values_size = values.length;
		buffer.putInt(parseInt(key));
		buffer.putInt(map_values_size);
		for (let i = 0; i < values.length; i++) {
			buffer.putInt(values[i]);
		}
	}
	return buffer.shrink(); // Shrink-ed Typed Array
};

// from tid.dat
TokenInfoDictionary.prototype.loadDictionary = function (array_buffer) {
	this.dictionary = new ByteBuffer(array_buffer);
	return this;
};

// from tid_pos.dat
TokenInfoDictionary.prototype.loadPosVector = function (array_buffer) {
	this.pos_buffer = new ByteBuffer(array_buffer);
	return this;
};

// from tid_map.dat
TokenInfoDictionary.prototype.loadTargetMap = function (array_buffer) {
	const buffer = new ByteBuffer(array_buffer);
	buffer.position = 0;
	this.target_map = {};
	buffer.readInt(); // map_keys_size
	while (true) {
		if (buffer.buffer.length < buffer.position + 1) {
			break;
		}
		const key = buffer.readInt();
		const map_values_size = buffer.readInt();
		for (let i = 0; i < map_values_size; i++) {
			const value = buffer.readInt();
			this.addMapping(key, value);
		}
	}
	return this;
};

/**
 * Look up features in the dictionary
 * @param {string} token_info_id_str Word ID to look up
 * @returns {string} Features string concatenated by ","
 */
TokenInfoDictionary.prototype.getFeatures = function (token_info_id_str) {
	const token_info_id = parseInt(token_info_id_str);
	if (isNaN(token_info_id)) {
		// TODO throw error
		return "";
	}
	const pos_id = this.dictionary.getInt(token_info_id + 6);
	return this.pos_buffer.getString(pos_id);
};

export default TokenInfoDictionary;
