package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	maxUploadSize = 10 << 20 // 10 MB
	uploadDir     = "./uploads"
)

var allowedTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

func Upload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := userIDFromSession(r)
	if userID == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		jsonError(w, "file too large (max 10MB)", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		jsonError(w, "image field is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read first 512 bytes to detect content type
	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	contentType := http.DetectContentType(buf[:n])

	ext, ok := allowedTypes[contentType]
	if !ok {
		jsonError(w, "only JPEG, PNG, GIF and WebP images are allowed", http.StatusBadRequest)
		return
	}

	// Seek back to start
	if seeker, ok := file.(io.Seeker); ok {
		seeker.Seek(0, io.SeekStart)
	}

	// Sanitize original name
	origName := strings.TrimSuffix(filepath.Base(header.Filename), filepath.Ext(header.Filename))
	if len(origName) > 32 {
		origName = origName[:32]
	}

	// Build unique filename
	ts := time.Now().UnixMilli()
	filename := fmt.Sprintf("%d_%s%s", ts, sanitizeName(origName), ext)

	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	dest, err := os.Create(filepath.Join(uploadDir, filename))
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer dest.Close()

	if _, err := io.Copy(dest, file); err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	url := "/uploads/" + filename
	jsonOK(w, http.StatusOK, map[string]string{"url": url})
}

func sanitizeName(s string) string {
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteRune('_')
		}
	}
	result := b.String()
	if len(result) == 0 {
		return "img"
	}
	return result
}
