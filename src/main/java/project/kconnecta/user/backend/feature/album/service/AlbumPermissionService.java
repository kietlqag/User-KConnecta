package project.kconnecta.user.backend.feature.album.service;

import project.kconnecta.user.backend.feature.album.entity.Album;

import java.util.UUID;

public interface AlbumPermissionService {

    boolean canView(UUID viewerId, Album album);

    boolean canEdit(UUID userId, Album album);

    void requireView(UUID viewerId, Album album);

    void requireEdit(UUID userId, Album album);
}
