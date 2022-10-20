package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/go-chi/chi"
)

//Dashboard contains all information to render a dashboard
type Dashboard struct {
	Title      string    `json:"title"`
	Slug       string    `json:"slug"`
	Background string    `json:"background"`
	Width      string    `json:"width"`
	Height     string    `json:"height"`
	Tags       []string  `json:"tags"`
	Elements   []Element `json:"elements"`
}

//Element contains any service/host information needed
type Element struct {
	Type     string                 `json:"type"`
	Title    string                 `json:"title"`
	Rect     Rect                   `json:"rect"`
	Options  map[string]interface{} `json:"options"`
	Rotation float64                `json:"rotation"`
}

//Rect helper struct for positions
type Rect struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	W float64 `json:"w"`
	H float64 `json:"h"`
}

func titleToSlug(title string) string {
	title = strings.ToLower(title)                //convert upper case to lower case
	title = strings.TrimSpace(title)              //remove preceeding and trailing whitespace
	dashSpaceMatch := regexp.MustCompile(`[_\s]`) //convert spaces and underscores to dashes
	title = dashSpaceMatch.ReplaceAllString(title, "-")
	unwantedMatch := regexp.MustCompile(`[^a-z0-9\-]`) //Remove any other characters
	title = unwantedMatch.ReplaceAllString(title, "")

	return title
}

func arrayContains(array []string, value string) bool {
	for _, v := range array {
		if v == value {
			return true
		}
	}
	return false
}

func ReadDashboardDir(dirname string) ([]Dashboard, error) {
	files, err := os.ReadDir(dirname)
	if err != nil {
		return nil, err
	}
	var dashboards []Dashboard
	for _, file := range files {
		if !strings.HasSuffix(file.Name(), ".json") {
			continue
		}
		f, err := os.Open(path.Join("dashboards", file.Name()))
		if err != nil {
			return dashboards, err
		}
		defer f.Close()
		var dash Dashboard
		if err := json.NewDecoder(f).Decode(&dash); err != nil {
			return dashboards, fmt.Errorf("decode dashboard %s: %w", f.Name(), err)
		}
		dash.Slug = slugFromFileName(f.Name())
		dashboards = append(dashboards, dash)
	}
	return dashboards, nil
}

func Tagged(dashboards []Dashboard, tag string) []Dashboard {
	var matches []Dashboard
	for _, dash := range dashboards {
		if arrayContains(dash.Tags, tag) {
			matches = append(matches, dash)
		}
	}
	return matches
}

func slugFromFileName(fileName string) string {
	return strings.TrimSuffix(fileName, filepath.Ext(fileName))
}

func handleListDashboards(w http.ResponseWriter, r *http.Request) {
	dashboards, err := ReadDashboardDir("dashboards")
	if err != nil {
		msg := fmt.Sprintf("read dashboard directory: %v", err)
		log.Println(msg)
		http.Error(w, msg, http.StatusInternalServerError)
	}

	tag := r.URL.Query().Get("tag")
	if tag != "" {
		dashboards = Tagged(dashboards, tag)
	}

	json.NewEncoder(w).Encode(dashboards)
}

func handleListDashboard(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	//Check dashboard exists
	if f, err := os.Open(path.Join("dashboards", slug+".json")); os.IsNotExist(err) {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	} else if err != nil {
		log.Println("Error checking that file exists:", err)
		http.Error(w, "Error checking file exists: "+err.Error(), http.StatusInternalServerError)
		return
	} else {
		w.Header().Add("content-type", "application/json")
		defer f.Close()
		_, err = io.Copy(w, f)
		if err != nil {
			log.Println("Error writing response:", err)
			http.Error(w, "Error writing response: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}
}

//SlugResponse contains the slug for the client to route to
type SlugResponse struct {
	Slug string `json:"slug"`
}

func handleCreateDashboard(w http.ResponseWriter, r *http.Request) {
	//Decode body
	buf := new(bytes.Buffer)
	buf.ReadFrom(r.Body)

	var dashboard Dashboard
	err := json.Unmarshal(buf.Bytes(), &dashboard)
	if err != nil {
		log.Println("JSON body decode failure:", err)
		http.Error(w, "Error decoding json body: "+err.Error(), http.StatusBadRequest)
		return
	}

	//Conver title to slug
	slug := titleToSlug(dashboard.Title)
	if len(slug) < 1 {
		log.Printf("Slugless URL")
		http.Error(w, "Generated URL must be atleast one character", http.StatusBadRequest)
		return
	}

	outputFile := path.Join("dashboards", slug+".json")

	//Check dashboard exists
	if _, err := os.Stat(outputFile); os.IsNotExist(err) {
		// path/to/whatever does not exist
		err = ioutil.WriteFile(outputFile, buf.Bytes(), 0655)
		if err != nil {
			log.Println("Error writing file:", err)
			http.Error(w, "Error writing file: "+err.Error(), http.StatusInternalServerError)
			return
		}
	} else if err != nil {
		log.Println("Error checking file exists:", err)
		http.Error(w, "Error checking file exists: "+err.Error(), http.StatusInternalServerError)
		return
	}

	//Return slug
	enc := json.NewEncoder(w)
	enc.Encode(SlugResponse{Slug: slug})
}

func trimFirstRune(s string) string {
	_, i := utf8.DecodeRuneInString(s)
	return s[i:]
}

func handleUpdateDashboard(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	//Check dashboard exists
	if _, err := os.Stat(path.Join("dashboards", slug+".json")); os.IsNotExist(err) {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	//Decode body
	var dashboard Dashboard
	buf := new(bytes.Buffer)
	buf.ReadFrom(r.Body)
	err := json.Unmarshal(buf.Bytes(), &dashboard)
	if err != nil {
		log.Println("JSON decode failure:", err)
		http.Error(w, "Error decoding json body: "+err.Error(), http.StatusBadRequest)
		return
	}

	//Set dimension of background
	width, height, err := getImageDimension(trimFirstRune(dashboard.Background))
	if err != nil {
		dashboard.Background = ""
	}
	dashboard.Height = strconv.Itoa(height)
	dashboard.Width = strconv.Itoa(width)

	//Convert title to slug
	slugNew := titleToSlug(dashboard.Title)
	if len(slug) < 1 {
		log.Println("Slugless URL")
		http.Error(w, "Generated URL must be atleast one character", http.StatusBadRequest)
		return
	}

	//Write updated file
	err = ioutil.WriteFile(path.Join("dashboards", slugNew+".json"), buf.Bytes(), 0655)
	if err != nil {
		log.Println("Error writing file:", err)
		http.Error(w, "Error writing file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	//Delete old file if slug updated
	if slug != slugNew {
		fmt.Printf("Slug updated %s -> %s deleting old data\n", slug, slugNew)
		err := os.Remove(path.Join("dashboards", slug+".json"))
		if err != nil {
			log.Println("Failed to remove old file:", err)
			http.Error(w, "Failed to remove old file: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	//Write slug to response so we can route to it
	enc := json.NewEncoder(w)
	enc.Encode(SlugResponse{Slug: slugNew})
}

func handleDeleteDashboard(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	//Check dashboard exists
	if _, err := os.Stat(path.Join("dashboards", slug+".json")); os.IsNotExist(err) {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	fmt.Printf("Deleting dashbaord %s\n", slug)
	err := os.Remove(path.Join("dashboards", slug+".json"))
	if err != nil {
		log.Println("Failed to remove old file:", err)
		http.Error(w, "Failed to remove old file: "+err.Error(), http.StatusInternalServerError)
		return
	}
}
