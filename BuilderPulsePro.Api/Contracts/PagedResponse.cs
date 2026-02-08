namespace BuilderPulsePro.Api.Contracts;

public record PagedResponse<T>(int Total, IReadOnlyList<T> Items);
