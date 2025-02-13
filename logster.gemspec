# coding: utf-8
# frozen_string_literal: true

lib = File.expand_path("../lib", __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require "logster/version"

Gem::Specification.new do |spec|
  spec.name = "logster"
  spec.version = Logster::VERSION
  spec.authors = ["Sam Saffron"]
  spec.email = ["sam.saffron@gmail.com"]
  spec.summary = "UI for viewing logs in Rack"
  spec.description = "UI for viewing logs in Rack"
  spec.homepage = "https://github.com/discourse/logster"
  spec.license = "MIT"

  spec.required_ruby_version = ">= 2.5.0"

  files = `git ls-files -z`.split("\x0").reject { |f| f.start_with?(/website|bin/) }
  files += Dir.glob("assets/javascript/*")
  files += Dir.glob("assets/stylesheets/*")
  spec.files = files

  spec.executables = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files = spec.files.grep(%r{^(test|spec|features)/})
  spec.require_paths = ["lib"]

  # NOTE dependency on rack is not explicit, this enables us to use
  # logster outside of rack (for reporting)

  spec.add_development_dependency "bundler"
  spec.add_development_dependency "rake"
  spec.add_development_dependency "rack"
  spec.add_development_dependency "redis"
  spec.add_development_dependency "guard"
  spec.add_development_dependency "guard-minitest"
  spec.add_development_dependency "timecop"
  spec.add_development_dependency "byebug", "~> 11.1.0"
  spec.add_development_dependency "rubocop-discourse", "~> 2.4.1"
  spec.add_development_dependency "syntax_tree"
end
