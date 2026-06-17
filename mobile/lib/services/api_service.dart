import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/puzzle.dart';
import '../models/community.dart';

class ApiService {
  static const String _baseKey = 'api_base_url';
  static const String _tokenKey = 'auth_token';

  String baseUrl;
  String? token;

  ApiService({this.baseUrl = 'http://localhost:8080'});

  Future<void> loadConfig() async {
    final prefs = await SharedPreferences.getInstance();
    baseUrl = prefs.getString(_baseKey) ?? baseUrl;
    token = prefs.getString(_tokenKey);
  }

  Future<void> setBaseUrl(String url) async {
    baseUrl = url;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseKey, url);
  }

  Future<void> setToken(String value) async {
    token = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, value);
  }

  Map<String, String> get _headers {
    final h = {'Content-Type': 'application/json'};
    if (token != null && token!.isNotEmpty) {
      h['Authorization'] = 'Bearer $token';
    }
    return h;
  }

  Future<List<dynamic>> listCategories() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/v1/categories'),
      headers: _headers,
    );
    if (res.statusCode == 200) return jsonDecode(res.body) as List;
    throw Exception('Categories failed: ${res.statusCode}');
  }

  Future<Puzzle> createPuzzle(Puzzle puzzle) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/v1/puzzles'),
      headers: _headers,
      body: jsonEncode(puzzle.toJson()),
    );
    if (res.statusCode == 201) {
      return Puzzle.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
    }
    throw Exception('Create puzzle failed: ${res.statusCode} ${res.body}');
  }

  Future<Community> createCommunity(Community community) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/v1/communities'),
      headers: _headers,
      body: jsonEncode(community.toJson()),
    );
    if (res.statusCode == 201) {
      return Community.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
    }
    throw Exception('Create community failed: ${res.statusCode} ${res.body}');
  }

  Future<Map<String, dynamic>> getMe() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/v1/me'),
      headers: _headers,
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Me failed: ${res.statusCode}');
  }
}
