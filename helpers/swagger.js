'use strict';

var jsonRefs = require('json-refs');
var YAML = require('js-yaml');
var path = require('path');
var fs = require('fs');
var Promise = require('bluebird');

var ZSchema = require('./z_schema');
var SwayHelpers = require('sway/lib/helpers');

// Used as private member to cache the spec resolution process
var resolvedSwaggerSpec = null;

/**
 * Uses Default Swagger Validator and extend with custom formats.
 *
 * @name swagger
 * @memberof module:helpers
 *
 * @requires module:helpers:z_schema
 * @requires sway
 *
 */


/**
 * Get Extended version of swagger validator
 *
 * @return {Object} - Instance of z-schema validator
 */
function getValidator () {

	// Get validator instace attached to Swagger
	var validator = SwayHelpers.getJSONSchemaValidator();

	// Register lisk formats with swagger
	Object.keys(ZSchema.formatsCache).forEach(function (formatName) {
		// Extend swagger validator with our formats
		validator.constructor.registerFormat(formatName, ZSchema.formatsCache[formatName]);
	});

	return validator;
}

/**
 * Get Resolved Swagger Spec in JSON format
 *
 * @return {Promise} - Resolved promise with content of resolved json spec
 */
function getResolvedSwaggerSpec () {

	if(resolvedSwaggerSpec) {
		return Promise.resolve(resolvedSwaggerSpec);
	} else {
		var content = getSwaggerSpec();

		var options = {
			includeInvalid: true,
			loaderOptions: {
				processContent: function (content, callback) {
					callback(null, YAML.safeLoad(content.text));
				}
			}
		};

		return jsonRefs.resolveRefs(content, options).then(function (results) {
			resolvedSwaggerSpec = results.resolved;
			return resolvedSwaggerSpec;
		});
	}
}

/**
 * Get Swagger Spec in JSON format
 *
 * @return {Object} - JSON object with swagger spec
 */
function getSwaggerSpec () {
	return YAML.safeLoad(fs.readFileSync(path.join(__dirname, '..', 'schema', 'swagger.yml')));
}

/**
 * Generate swagger based param error object to handle custom errors
 *
 * @param {Array} params - List of param objects
 * @param {Array} messages - List of error messages
 * @param {Array} [codes] - List of codes for particular error
 *
 * @return {object}
 */
function generateParamsErrorObject (params, messages, codes) {

	if (!codes){ codes = []; }

	var error = new Error('Validation errors');
	error.statusCode = 400;

	error.errors = params.map(function (p, i) {
		var def = p.parameterObject;
		return {name: def.name, message: messages[i], in: def.in, code: (codes[i] || 'INVALID_PARAM')};
	});
	return error;
}

module.exports = {
	getValidator: getValidator,
	getResolvedSwaggerSpec: getResolvedSwaggerSpec,
	getSwaggerSpec: getSwaggerSpec,
	generateParamsErrorObject: generateParamsErrorObject
};
