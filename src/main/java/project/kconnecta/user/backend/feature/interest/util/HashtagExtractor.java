package project.kconnecta.user.backend.feature.interest.util;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

public final class HashtagExtractor {

    private static final Pattern HASHTAG = Pattern.compile("#([\\p{L}\\p{N}_]{2,50})");
    private static final int MAX_TOPICS = 10;

    private HashtagExtractor() {}

    public static List<String> extract(String content) {
        if (content == null || content.isBlank()) {
            return List.of();
        }
        LinkedHashSet<String> topics = new LinkedHashSet<>();
        var matcher = HASHTAG.matcher(content);
        while (matcher.find() && topics.size() < MAX_TOPICS) {
            topics.add(matcher.group(1).toLowerCase(Locale.ROOT));
        }
        return new ArrayList<>(topics);
    }
}
