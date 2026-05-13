package project.kconnecta.user.backend.feature.live.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class LiveDestinationsResponse {
    private List<LiveDestinationItem> pages;
    private List<LiveDestinationItem> groups;
}

