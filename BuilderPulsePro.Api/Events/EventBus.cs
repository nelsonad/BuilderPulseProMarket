namespace BuilderPulsePro.Api.Events;

public interface IEventHandler<in TEvent> where TEvent : IDomainEvent
{
    Task HandleAsync(TEvent evt, CancellationToken ct);
}

public interface IEventBus
{
    Task PublishAsync<TEvent>(TEvent evt, CancellationToken ct = default)
        where TEvent : IDomainEvent;
}
