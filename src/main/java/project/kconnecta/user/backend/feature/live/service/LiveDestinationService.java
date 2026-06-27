package project.kconnecta.user.backend.feature.live.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.feature.group.repository.GroupMemberRepository;
import project.kconnecta.user.backend.feature.live.dto.response.LiveDestinationItem;
import project.kconnecta.user.backend.feature.live.dto.response.LiveDestinationsResponse;
import project.kconnecta.user.backend.feature.page.repository.PageRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LiveDestinationService {

    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final PageRepository pageRepository;

    public LiveDestinationsResponse getDestinations(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<LiveDestinationItem> pages = pageRepository.findAllByCreatedByIdOrderByUpdatedAtDesc(userId)
                .stream()
                .map(page -> LiveDestinationItem.builder()
                        .id(page.getId())
                        .name(page.getName())
                        .description(page.getDescription())
                        .coverPhotoUrl(page.getAvatarUrl())
                        .build())
                .toList();

        List<LiveDestinationItem> groups = groupMemberRepository
                .findAllByUserId(userId)
                .stream()
                .map(gm -> LiveDestinationItem.builder()
                        .id(gm.getGroup().getId())
                        .name(gm.getGroup().getName())
                        .description(gm.getGroup().getDescription())
                        .coverPhotoUrl(gm.getGroup().getCoverPhotoUrl())
                        .build())
                .toList();

        return LiveDestinationsResponse.builder()
                .pages(pages)
                .groups(groups)
                .build();
    }
}
