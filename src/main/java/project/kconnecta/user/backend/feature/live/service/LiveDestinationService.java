package project.kconnecta.user.backend.feature.live.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberRole;
import project.kconnecta.user.backend.feature.group.repository.GroupMemberRepository;
import project.kconnecta.user.backend.feature.live.dto.response.LiveDestinationItem;
import project.kconnecta.user.backend.feature.live.dto.response.LiveDestinationsResponse;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LiveDestinationService {

    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;

    public LiveDestinationsResponse getDestinations(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Nguoi dung khong ton tai"));

        List<LiveDestinationItem> pages = List.of(
                LiveDestinationItem.builder()
                        .id(user.getId())
                        .name(user.getFullName())
                        .description("Trang ban quan ly")
                        .build()
        );

        List<LiveDestinationItem> groups = groupMemberRepository
                .findAllByUserIdAndRole(userId, GroupMemberRole.ADMIN)
                .stream()
                .map(gm -> LiveDestinationItem.builder()
                        .id(gm.getGroup().getId())
                        .name(gm.getGroup().getName())
                        .description(gm.getGroup().getDescription())
                        .build())
                .toList();

        return LiveDestinationsResponse.builder()
                .pages(pages)
                .groups(groups)
                .build();
    }
}

