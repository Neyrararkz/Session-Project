package services

import (
	"itstep-network/config"
	"itstep-network/internal/repository"
)

// AppService будет содержать бизнес-логику платформы
type AppService struct {
	Repo   *repository.Repository
	Config *config.Config
}

func NewAppService(repo *repository.Repository, cfg *config.Config) *AppService {
	return &AppService{Repo: repo, Config: cfg}
}

// Позже мы добавим сюда бизнес-логику, которая будет связывать хендлеры и базу данных