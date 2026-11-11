package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// ServiceInfo is written by new-go-service.sh.
type ServiceInfo struct {
	Name      string `json:"name"`
	Module    string `json:"module"`
	GoVersion string `json:"go_version"`
	Mode      string `json:"mode"`
}

// FeatureSpec mirrors the parts of the descriptor that affect documentation.
type FeatureSpec struct {
	Feature struct {
		Name        string `json:"name"`
		Aggregate   string `json:"aggregate"`
		Plural      string `json:"plural"`
		Table       string `json:"table"`
		Route       string `json:"route"`
		Description string `json:"description"`
	} `json:"feature"`
	Fields []struct {
		Name     string   `json:"name"`
		Type     string   `json:"type"`
		Required bool     `json:"required"`
		Nullable bool     `json:"nullable"`
		PK       bool     `json:"pk"`
		Unique   bool     `json:"unique"`
		Min      *float64 `json:"min"`
		Max      *float64 `json:"max"`
		MaxLen   *int     `json:"max_len"`
		Enum     []string `json:"enum"`
		Default  any      `json:"default"`
	} `json:"fields"`
	UseCases []struct {
		Name string `json:"name"`
		HTTP *struct {
			Method string `json:"method"`
			Path   string `json:"path"`
			Status int    `json:"status"`
		} `json:"http"`
	} `json:"use_cases"`
	Adapters struct {
		Memory   bool `json:"memory"`
		Postgres bool `json:"postgres"`
	} `json:"adapters"`
}

func loadService(root string) (ServiceInfo, error) {
	var info ServiceInfo
	raw, err := os.ReadFile(filepath.Join(root, ".scaffold", "service.json"))
	if err != nil {
		return info, fmt.Errorf("leia .scaffold/service.json: %w", err)
	}
	if err := json.Unmarshal(raw, &info); err != nil {
		return info, fmt.Errorf("service.json inválido: %w", err)
	}
	if info.Name == "" || info.Module == "" {
		return info, fmt.Errorf("service.json sem name/module")
	}
	return info, nil
}

func loadFeatures(root string) ([]FeatureSpec, error) {
	files, err := filepath.Glob(filepath.Join(root, ".scaffold", "features", "*.json"))
	if err != nil {
		return nil, err
	}

	var features []FeatureSpec
	for _, file := range files {
		if strings.HasSuffix(file, ".state.json") {
			continue
		}
		raw, err := os.ReadFile(file)
		if err != nil {
			return nil, err
		}
		var spec FeatureSpec
		if err := json.Unmarshal(raw, &spec); err != nil {
			return nil, fmt.Errorf("%s: %w", filepath.Base(file), err)
		}
		applyDefaults(&spec)
		features = append(features, spec)
	}

	sort.Slice(features, func(i, j int) bool { return features[i].Feature.Name < features[j].Feature.Name })
	return features, nil
}

func applyDefaults(spec *FeatureSpec) {
	if spec.Feature.Plural == "" {
		spec.Feature.Plural = spec.Feature.Name + "s"
	}
	if spec.Feature.Table == "" {
		spec.Feature.Table = spec.Feature.Plural
	}
	for i := range spec.UseCases {
		uc := &spec.UseCases[i]
		if uc.HTTP != nil {
			continue
		}
		switch uc.Name {
		case "Create":
			uc.HTTP = &struct {
				Method string `json:"method"`
				Path   string `json:"path"`
				Status int    `json:"status"`
			}{Method: "POST", Path: spec.Feature.Route, Status: 201}
		case "Get":
			uc.HTTP = &struct {
				Method string `json:"method"`
				Path   string `json:"path"`
				Status int    `json:"status"`
			}{Method: "GET", Path: spec.Feature.Route + "/{id}", Status: 200}
		case "List":
			uc.HTTP = &struct {
				Method string `json:"method"`
				Path   string `json:"path"`
				Status int    `json:"status"`
			}{Method: "GET", Path: spec.Feature.Route, Status: 200}
		}
	}
}
